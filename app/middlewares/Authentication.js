import AuthenticationService from '../services/AuthenticationService';
import path from 'path';
import RolesHasPermissions from '../models/RolesHasPermissions.js';
import Permission from '../models/Permission.js';
import jwt from 'jsonwebtoken';
import flashMessages from '../imports/FlashMessages.js';

const authenticationService = new AuthenticationService;

/**
 * Check if user is autheticated, in case not, show login page
 * Verifica si el usuario está autenticado, de lo contrario muestra la pagina de login
 */
var sessionChecker = function (req, res, next){
    if(req.session.user){
        next();
    }else{
        authenticationService.renderLoginView(req,res);
    }
};

/*
 * En cada petición de un usuario logeado persiste sus permisos y roles asociados en la session
*/
 var setSessionResponse = function (req, res, next){
    res.locals.session = req.session;
    res.locals.can = function(ppermission){
        let permissions = res.locals.session.permissions;
        var exist = permissions.find(permission => (permission==ppermission));
        if(exist != undefined)
            return true;
        return false;
    }
    res.locals.isRole = function(prole){
        let roles = req.session.roles;
        var exist = roles.find(rol => (rol.rol==prole));
        if(exist != undefined)
            return true;
        return false;
    }
    next();
};

/**
 * Check if user have permission for execute service 
 */
let checkPermission = function (pname){
    return async function (req, res, next){
        let roles = req.session.roles;
        let hasPermission = false;
        let permission = await Permission.findOne({where: {name: pname}});
        if(permission == null){
            flashMessages.showErrorMessage(req, "Error!", "El usuario no tiene los permisos!");
            req.session.save(()=>{ res.redirect('/backend/home') });
            return 0;
        }
        for(let rol of roles){
            let existPermission = await RolesHasPermissions.findOne({where:{idrol:rol.idrol, idpermission: permission.idpermission}});
            if(existPermission){
                hasPermission = true;
                break;
            }
        }
        if(hasPermission)
            next();
        else{
            flashMessages.showErrorMessage(req, "Error!", "El usuario no tiene los permisos!");
            req.session.save(()=>{ res.redirect('/backend/home') });
        }
            
    }
}

//Decode Json
let decodeToken =  async function (req, res, next){
    try{
        //Remove string 'Bearer ' from token
        let token = req.headers.authorization.replace("Bearer ","");
        let payload = jwt.verify(req.headers.authorization.replace("Bearer ",""), process.env.SEED);
        req.payload = payload;
        next();
    }
    catch(err){
        throw err;
    }
};

module.exports.sessionChecker = sessionChecker;
module.exports.checkPermission = checkPermission;
module.exports.setSessionResponse = setSessionResponse;
module.exports.decodeToken = decodeToken;